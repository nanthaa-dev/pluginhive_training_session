import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import OrderForm from "./OrderForm";
import { FakeApiError } from "../fakeApi";
import { DELIVERY_NOTE_MAX_LENGTH } from "../lib/deliveryNote";
import type { CreateOrderInput, Order } from "../types";

type SaveOrder = (
  input: CreateOrderInput,
  idempotencyKey: string,
) => Promise<Order>;

function createSavedOrder(input: CreateOrderInput): Order {
  return {
    id: "FAKE-TEST-1",
    customer: input.customer,
    product: input.product,
    status: "Pending",
    ...(input.note ? { note: input.note } : {}),
  };
}

function renderOrderForm(saveOrder?: SaveOrder) {
  return render(
    <OrderForm
      saveOrder={
        saveOrder ??
        vi.fn(async (input: CreateOrderInput) => createSavedOrder(input))
      }
      createIdempotencyKey={() => "test-idempotency-key"}
    />,
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: /Customer/ }), "Ava Lee");
  await user.type(screen.getByRole("textbox", { name: /Product/ }), "Parcel");
}

describe("OrderForm delivery note", () => {
  it("accepts an empty optional note", async () => {
    const user = userEvent.setup();
    const saveOrder = vi.fn(async (input: CreateOrderInput) =>
      createSavedOrder(input),
    );
    renderOrderForm(saveOrder);
    await fillRequiredFields(user);
    await user.type(
      screen.getByRole("textbox", { name: "Delivery note" }),
      "   ",
    );
    await user.click(screen.getByRole("button", { name: "Save order" }));

    await screen.findByRole("status");
    expect(saveOrder).toHaveBeenCalledWith(
      { customer: "Ava Lee", product: "Parcel", note: undefined },
      "test-idempotency-key",
    );
  });

  it("accepts exactly 200 characters", async () => {
    const user = userEvent.setup();
    const saveOrder = vi.fn(async (input: CreateOrderInput) =>
      createSavedOrder(input),
    );
    renderOrderForm(saveOrder);
    await fillRequiredFields(user);
    await user.type(
      screen.getByRole("textbox", { name: "Delivery note" }),
      ` ${"n".repeat(DELIVERY_NOTE_MAX_LENGTH)} `,
    );
    await user.click(screen.getByRole("button", { name: "Save order" }));

    await screen.findByRole("status");
    expect(saveOrder.mock.calls[0][0].note).toHaveLength(DELIVERY_NOTE_MAX_LENGTH);
  });

  it("shows a validation error for 201 characters after submission", async () => {
    const user = userEvent.setup();
    const saveOrder = vi.fn(async (input: CreateOrderInput) =>
      createSavedOrder(input),
    );
    renderOrderForm(saveOrder);
    await fillRequiredFields(user);
    await user.type(
      screen.getByRole("textbox", { name: "Delivery note" }),
      "n".repeat(DELIVERY_NOTE_MAX_LENGTH + 1),
    );
    await user.click(screen.getByRole("button", { name: "Save order" }));

    expect(
      screen.getByText("Delivery note must be 200 characters or fewer."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Delivery note" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(saveOrder).not.toHaveBeenCalled();
  });

  it("clears the note validation error after the note is corrected", async () => {
    const user = userEvent.setup();
    renderOrderForm();
    await fillRequiredFields(user);
    const note = screen.getByRole("textbox", { name: "Delivery note" });
    await user.type(note, "n".repeat(DELIVERY_NOTE_MAX_LENGTH + 1));
    await user.click(screen.getByRole("button", { name: "Save order" }));
    expect(
      screen.getByText("Delivery note must be 200 characters or fewer."),
    ).toBeInTheDocument();

    await user.clear(note);
    expect(
      screen.queryByText("Delivery note must be 200 characters or fewer."),
    ).not.toBeInTheDocument();
    expect(note).toHaveAttribute("aria-invalid", "false");
  });

  it("shows a server 400 fields.note error on the note field and summary", async () => {
    const user = userEvent.setup();
    const saveOrder = vi.fn(async (): Promise<Order> => {
      throw new FakeApiError(400, { note: "The delivery note was rejected." });
    });
    renderOrderForm(saveOrder);
    await fillRequiredFields(user);
    await user.type(
      screen.getByRole("textbox", { name: "Delivery note" }),
      "Leave at the side door.",
    );
    await user.click(screen.getByRole("button", { name: "Save order" }));

    const note = screen.getByRole("textbox", { name: "Delivery note" });
    expect(
      await screen.findByText("The delivery note was rejected."),
    ).toBeInTheDocument();
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(note.getAttribute("aria-describedby")).toContain("delivery-note-hint");
    expect(note.getAttribute("aria-describedby")).toContain("delivery-note-error");
    expect(
      screen.getByRole("link", {
        name: "Delivery note: The delivery note was rejected.",
      }),
    ).toHaveAttribute("href", "#delivery-note");
  });

  it("preserves values after a failed save and retries with the same key", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const receivedKeys: string[] = [];
    const saveOrder = vi.fn(
      async (
        input: CreateOrderInput,
        idempotencyKey: string,
      ): Promise<Order> => {
        attempts += 1;
        receivedKeys.push(idempotencyKey);
        if (attempts === 1) {
          throw new Error("Temporary network failure");
        }
        return createSavedOrder(input);
      },
    );
    renderOrderForm(saveOrder);
    await fillRequiredFields(user);
    const note = screen.getByRole("textbox", { name: "Delivery note" });
    await user.type(note, "Call on arrival.");
    await user.click(screen.getByRole("button", { name: "Save order" }));

    expect(
      await screen.findByText(
        "We could not save the order. Your values are preserved. Try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Customer/ })).toHaveValue("Ava Lee");
    expect(screen.getByRole("textbox", { name: /Product/ })).toHaveValue("Parcel");
    expect(note).toHaveValue("Call on arrival.");

    await user.click(screen.getByRole("button", { name: "Try Again" }));
    await screen.findByText("Order saved successfully.");
    expect(saveOrder).toHaveBeenCalledTimes(2);
    expect(receivedKeys[0]).toBe(receivedKeys[1]);
    expect(saveOrder.mock.calls[1][0].note).toBe("Call on arrival.");
  });

  it("shows the saving state and blocks duplicate submissions", async () => {
    const user = userEvent.setup();
    let resolveSave: ((order: Order) => void) | undefined;
    const saveOrder = vi.fn(
      () =>
        new Promise<Order>((resolve) => {
          resolveSave = resolve;
        }),
    );
    renderOrderForm(saveOrder);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Save order" }));

    const savingButton = screen.getByRole("button", { name: "Saving…" });
    expect(savingButton).toBeDisabled();
    expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
    expect(saveOrder).toHaveBeenCalledTimes(1);
    fireEvent.submit(screen.getByRole("form", { name: "Create an order" }));
    expect(saveOrder).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave?.(createSavedOrder({ customer: "Ava Lee", product: "Parcel" }));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save order" })).toBeEnabled();
    });
  });

  it("has no axe accessibility violations", async () => {
    const { container } = renderOrderForm();
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
