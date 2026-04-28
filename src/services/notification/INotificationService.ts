export interface PriceAlertParams {
  productTitle: string;
  productUrl: string;
  currentPrice: number;
  targetPrice: number;
  productImage?: string;
}

export interface StockAlertParams {
  productTitle: string;
  productUrl: string;
  productImage?: string;
}

export interface INotificationService {
  sendPriceAlert(params: PriceAlertParams): Promise<void>;
  sendStockAlert(params: StockAlertParams): Promise<void>;
}
