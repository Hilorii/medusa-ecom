import { updateCartWorkflow } from "@medusajs/core-flows";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules, validateEmail } from "@medusajs/framework/utils";
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers";
import type { StoreUpdateCartType } from "@medusajs/medusa/api/store/carts/validators";
import type { CustomerDTO } from "@medusajs/types";

type StoreUpdateCartRequestBody = StoreUpdateCartType & {
  additional_data?: Record<string, unknown>;
};

const DUPLICATE_GUEST_FRAGMENT = "has_account: false";

function isGuestEmailConflictError(error: unknown): error is MedusaError {
  if (!MedusaError.isMedusaError(error)) {
    return false;
  }

  if (error.type !== MedusaError.Types.INVALID_DATA) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("customer with email") &&
    message.includes(DUPLICATE_GUEST_FRAGMENT)
  );
}

async function resolveGuestEmailConflict(
  error: unknown,
  req: MedusaRequest,
  email?: string,
): Promise<boolean> {
  if (!isGuestEmailConflictError(error) || !email) {
    return false;
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER) as {
    listCustomers: (
      selector: Record<string, unknown>,
    ) => Promise<CustomerDTO[]>;
  };

  const customers = await customerModule.listCustomers({ email });
  const guest = customers.find((customer) => !customer.has_account);

  if (!guest) {
    return false;
  }

  const cartModule = req.scope.resolve(Modules.CART) as {
    updateCarts: (
      data: Array<{ id: string; customer_id: string; email: string }>,
    ) => Promise<unknown>;
  };

  await cartModule.updateCarts([
    {
      id: req.params.id,
      customer_id: guest.id,
      email,
    },
  ]);

  return true;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields,
  );

  res.json({ cart });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.validatedBody as StoreUpdateCartRequestBody;
  const normalizedEmail =
    typeof body.email === "string" ? validateEmail(body.email) : body.email;

  const workflowInput = {
    ...body,
    ...(typeof normalizedEmail !== "undefined"
      ? { email: normalizedEmail }
      : {}),
    id: req.params.id,
  };

  const runUpdateCart = () =>
    updateCartWorkflow(req.scope).run({
      // @ts-ignore
      input: workflowInput,
    });

  try {
    await runUpdateCart();
  } catch (error) {
    const handled = await resolveGuestEmailConflict(
      error,
      req,
      typeof normalizedEmail === "string" ? normalizedEmail : undefined,
    );

    if (!handled) {
      throw error;
    }

    await runUpdateCart();
  }

  const cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields,
  );

  res.status(200).json({ cart });
};
