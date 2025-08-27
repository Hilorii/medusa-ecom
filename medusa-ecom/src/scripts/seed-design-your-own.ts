// Run with: npx medusa exec ./src/scripts/seed-design-your-own.ts

import type { ExecArgs } from "@medusajs/framework/types"
import {
    Modules,
    ContainerRegistrationKeys,
    ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

export default async function seedDesignYourOwn({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productModule = container.resolve(Modules.PRODUCT)
    const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)

    // 0) Idempotencja – nie duplikuj
    const existing = await productModule.listProducts({ handle: ["design-your-own"] })
    if (existing?.length) {
        logger.info(`Design Your Own already exists: ${existing[0].id}`)
        return
    }

    // 1) Podłącz do domyślnego kanału sprzedaży (jeśli jest)
    const sc = await salesChannelModule.listSalesChannels({ name: "Default Sales Channel" })
    const sales_channels = sc?.length ? [{ id: sc[0].id }] : []

    // 2) Minimalny produkt + 1 opcja ("Type") z 1 wartością ("Custom")
    //    WARTOŚCI opcji przekazujemy jako OBIEKTY { value: string }
    //    Wariant używa options_map (klucz = tytuł opcji, wartość = wartość opcji)
    const productData = {
        title: "Design Your Own",
        handle: "design-your-own",
        status: ProductStatus.PUBLISHED,
        description:
            "Configurable custom product. Price is calculated server-side based on size, material, and color.",
        images: [{ url: "https://via.placeholder.com/800x600?text=Design+Your+Own" }],
        sales_channels,
        options: [
            {
                title: "Type",
                values: [{ value: "Custom" }], // <-- ważne: obiekty, nie stringi
            },
        ],
        variants: [
            {
                title: "Custom",
                sku: "dyo-default",
                // <-- klucz: tytuł opcji z 'options', wartość: jedna z values
                options_map: { Type: "Custom" },
                prices: [
                    { currency_code: "eur", amount: 0 }, // cenę nadpiszemy unit_price w koszyku
                ],
            },
        ],
    }

    const { result } = await createProductsWorkflow(container).run({
        // DTO w v2 bywa rygorystyczne — rzutujemy na any w seedzie (bezpieczne tutaj)
        input: { products: [productData as any] },
    })

    const created = result?.[0]
    if (!created) {
        logger.error("Failed to create Design Your Own product.")
        return
    }

    logger.info(
        `Created product: ${created.title} (${created.id}) variant: ${created.variants?.[0]?.id}`
    )
}
