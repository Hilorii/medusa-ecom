import { ModuleProvider } from "@medusajs/framework/utils"
import { Modules } from "@medusajs/framework/utils"
import GgResendNotificationProviderService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [GgResendNotificationProviderService],
})
