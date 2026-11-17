import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { createOrder, FakeApiError } from "../fakeApi";
import {
  DELIVERY_NOTE_MAX_LENGTH,
  normalizeDeliveryNote,
  validateDeliveryNote,
} from "../lib/deliveryNote";
import type { CreateOrderInput, Order } from "../types";
import TextAreaField from "./TextAreaField";
import TextField from "./TextField";

type SaveOrder = (
  input: CreateOrderInput,
  idempotencyKey: string,
) => Promise<Order>;

type FieldErrors = Partial<Record<keyof CreateOrderInput, string>>;

interface OrderFormProps {
  onCreated?: (order: Order) => void;
  saveOrder?: SaveOrder;
  createIdempotencyKey?: () => string;
}

const INITIAL_FIELDS: CreateOrderInput & { note: string } = {
  customer: "",
  product: "",
  note: "",
};

function validateFields(fields: CreateOrderInput & { note: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.customer.trim()) {
    errors.customer = "Enter a customer name.";
  }
  if (!fields.product.trim()) {
    errors.product = "Enter a product.";
  }

  const noteError = validateDeliveryNote(fields.note);
  if (noteError) {
    errors.note = noteError;
  }

  return errors;
}

function OrderForm({
  onCreated,
  saveOrder = createOrder,
  createIdempotencyKey = () => crypto.randomUUID(),
}: OrderFormProps) {
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaveFailure, setHasSaveFailure] = useState(false);
  const savingRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const visibleErrors: FieldErrors = hasSubmitted
    ? {
        customer: clientErrors.customer ?? serverErrors.customer,
        product: clientErrors.product ?? serverErrors.product,
        note: clientErrors.note ?? serverErrors.note,
      }
    : {};

  function updateField(field: keyof CreateOrderInput, value: string) {
    setFields((currentFields) => ({ ...currentFields, [field]: value }));
    setServerErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSubmitError("");
    setSaveSucceeded(false);

    if (hasSubmitted) {
      const nextFields = { ...fields, [field]: value };
      setClientErrors(validateFields(nextFields));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) {
      return;
    }

    setHasSubmitted(true);
    setSaveSucceeded(false);
    setSubmitError("");
    setServerErrors({});

    const errors = validateFields(fields);
    setClientErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      setHasSaveFailure(false);
      return;
    }

    const idempotencyKey =
      idempotencyKeyRef.current ?? createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;

    savingRef.current = true;
    setIsSaving(true);
    setHasSaveFailure(false);

    const input: CreateOrderInput = {
      customer: fields.customer.trim(),
      product: fields.product.trim(),
      note: normalizeDeliveryNote(fields.note),
    };

    try {
      const order = await saveOrder(input, idempotencyKey);
      onCreated?.(order);
      setFields(INITIAL_FIELDS);
      setClientErrors({});
      setServerErrors({});
      setHasSubmitted(false);
      setHasSaveFailure(false);
      setSaveSucceeded(true);
      idempotencyKeyRef.current = null;
    } catch (error) {
      setHasSaveFailure(true);
      if (error instanceof FakeApiError && error.status === 400) {
        setServerErrors(error.fields);
        setSubmitError("Please correct the highlighted field and try again.");
      } else {
        setSubmitError(
          "We could not save the order. Your values are preserved. Try again.",
        );
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  const errorEntries = Object.entries(visibleErrors).filter(
    (entry): entry is [keyof CreateOrderInput, string] =>
      typeof entry[1] === "string",
  );

  return (
    <section className="order-form-panel" aria-labelledby="create-order-heading">
      <h2 id="create-order-heading">Create an order</h2>

      {errorEntries.length > 0 && (
        <div
          className="error-summary"
          role="alert"
          aria-labelledby="error-summary-heading"
        >
          <h3 id="error-summary-heading">There is a problem</h3>
          <ul>
            {errorEntries.map(([field, message]) => {
              const label =
                field === "note"
                  ? "Delivery note"
                  : field === "customer"
                    ? "Customer"
                    : "Product";
              const target = field === "note" ? "delivery-note" : field;
              return (
                <li key={field}>
                  <a href={`#${target}`}>
                    {label}: {message}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {submitError && <p className="form-message error" role="alert">{submitError}</p>}
      {saveSucceeded && (
        <p className="form-message success" role="status">
          Order saved successfully.
        </p>
      )}

      <form
        onSubmit={(event) => void handleSubmit(event)}
        aria-labelledby="create-order-heading"
        aria-busy={isSaving}
        noValidate
      >
        <fieldset disabled={isSaving}>
          <legend className="visually-hidden">New order details</legend>
          <TextField
            id="customer"
            label="Customer"
            value={fields.customer}
            onChange={(value) => updateField("customer", value)}
            error={visibleErrors.customer}
            required
            autoComplete="name"
          />
          <TextField
            id="product"
            label="Product"
            value={fields.product}
            onChange={(value) => updateField("product", value)}
            error={visibleErrors.product}
            required
          />
          <TextAreaField
            id="delivery-note"
            label="Delivery note"
            value={fields.note}
            onChange={(value) => updateField("note", value)}
            hint={`Optional. Up to ${DELIVERY_NOTE_MAX_LENGTH} characters.`}
            error={visibleErrors.note}
          />
        </fieldset>
        <button className="save-order-button" type="submit" disabled={isSaving}>
          {isSaving
            ? "Saving…"
            : hasSaveFailure
              ? "Try Again"
              : "Save order"}
        </button>
      </form>
    </section>
  );
}

export default OrderForm;
