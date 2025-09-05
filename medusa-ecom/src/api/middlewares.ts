import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http";
import { PostAdminCreateBrand } from "./admin/brands/validators";
import { z } from "zod";

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/brands",
      method: "POST",
      middlewares: [validateAndTransformBody(PostAdminCreateBrand)],
    },
    {
      matcher: "/admin/products",
      method: ["POST"],
      additionalDataValidator: {
        brand_id: z.string().optional(),
      },
    },
    {
      matcher: "/store/designs/upload",
      method: ["POST", "OPTIONS"],
      bodyParser: {
        // Needed to raise size limit for files to upload! It is set to 6MB in .env for users right now.
        sizeLimit: "15mb",
      },
    },
    {
      matcher: "/hooks/payment/*",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },
  ],
});
