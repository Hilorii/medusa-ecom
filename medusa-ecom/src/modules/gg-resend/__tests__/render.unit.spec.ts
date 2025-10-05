jest.mock("@react-email/render", () => ({
  render: jest.fn().mockResolvedValue("<html>mocked</html>"),
}));

jest.mock("../emails/GgOrderPlaced", () => ({
  __esModule: true,
  default: jest.fn((props) => ({ template: "order-placed", props })),
}));

jest.mock("../emails/GgShipmentCreated", () => ({
  __esModule: true,
  default: jest.fn((props) => ({ template: "shipment-created", props })),
}));

import { ggRenderEmail } from "../render";
import { render } from "@react-email/render";
import GgOrderPlacedEmail from "../emails/GgOrderPlaced";
import GgShipmentCreatedEmail from "../emails/GgShipmentCreated";

describe("ggRenderEmail", () => {
  const originalShopName = process.env.GG_SHOP_NAME;
  const mockedRender = jest.mocked(render);
  const mockedOrderPlacedEmail = jest.mocked(GgOrderPlacedEmail);
  const mockedShipmentCreatedEmail = jest.mocked(GgShipmentCreatedEmail);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GG_SHOP_NAME = "Test Shop";
  });

  afterAll(() => {
    if (originalShopName === undefined) {
      delete process.env.GG_SHOP_NAME;
    } else {
      process.env.GG_SHOP_NAME = originalShopName;
    }
  });

  it("renders order-placed template with expected subject and payload", async () => {
    const result = await ggRenderEmail("order-placed", {
      order_id: 1234,
      status_url: "https://example.com/status",
    });

    expect(result).toEqual({
      subject: "Order #1234 confirmed",
      html: "<html>mocked</html>",
    });

    expect(mockedOrderPlacedEmail).toHaveBeenCalledWith({
      order_id: "1234",
      status_url: "https://example.com/status",
      shop_name: "Test Shop",
    });

    expect(mockedRender).toHaveBeenCalledWith({
      template: "order-placed",
      props: {
        order_id: "1234",
        status_url: "https://example.com/status",
        shop_name: "Test Shop",
      },
    });
  });

  it("renders shipment-created template with expected subject and payload", async () => {
    const result = await ggRenderEmail("shipment-created", {
      order_id: 9876,
      tracking_number: 42,
      tracking_url: "https://example.com/tracking",
    });

    expect(result).toEqual({
      subject: "Your order #9876 is on the way",
      html: "<html>mocked</html>",
    });

    expect(mockedShipmentCreatedEmail).toHaveBeenCalledWith({
      order_id: "9876",
      tracking_number: "42",
      tracking_url: "https://example.com/tracking",
      shop_name: "Test Shop",
    });

    expect(mockedRender).toHaveBeenCalledWith({
      template: "shipment-created",
      props: {
        order_id: "9876",
        tracking_number: "42",
        tracking_url: "https://example.com/tracking",
        shop_name: "Test Shop",
      },
    });
  });

  it("falls back to default payload when template is unknown", async () => {
    const result = await ggRenderEmail("unknown-template", {});

    expect(result).toEqual({
      subject: "Notification",
      html: "<p>Hello!</p>",
    });

    expect(mockedRender).not.toHaveBeenCalled();
  });
});
