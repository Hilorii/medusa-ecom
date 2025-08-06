import BrandModule from "../modules/brand";
import ProductModule from "@medusajs/medusa/product";
import { defineLink } from "@medusajs/framework/utils";

export default defineLink(
  {
    linkable: ProductModule.linkable.product,
    isList: true, //brand can be linked with multiple products
  },
  BrandModule.linkable.brand,
);
