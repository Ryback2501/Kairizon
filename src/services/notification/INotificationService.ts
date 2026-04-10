export interface PriceAlertParams {
  productTitle: string;
  productUrl: string;
  currentPrice: number;
  targetPrice: number;
}

export interface StockAlertParams {
  productTitle: string;
  productUrl: string;
}

export interface INotificationService {
  sendPriceAlert(params: PriceAlertParams): Promise<void>;
  sendStockAlert(params: StockAlertParams): Promise<void>;
}
