export interface InvoiceHeader {
  OrderKey: string;
  OrderID: number;
  BranchName: string;
  ExternalCode: string;
  Type: 'E-FATURA' | 'E-ARŞİV';
  InvoiceTotal: number;
  OrderDiscount: number;
  InvoiceDate: string;
  CustomerName: string;
  CustomerTaxNo: string;
  REF_NO?: string; // Logo aktarım referans numarası
  CustomerTaxOffice: string;
  CustomerEMail: string;
  CustomerAddress: string;
  RefNo: string;
  UserCode: string;
  UserType: string;
  ItemCount: number;
  PaymentCount: number;
  IsTransferred: number; // 1 = aktarıldı, 0 = aktarılmadı
}

export interface InvoiceItem {
  TransactionKey: string;
  ItemCode: string;
  ItemsDefinition: string;
  TaxPercent: number;
  Quantity: number;
  UnitPrice: number;
  Amount: number;
  DiscountTotal: number;
  IsMainCombo: boolean;
  MainTransactionKey?: string;
}

export interface InvoicePayment {
  PaymentKey: string;
  PaymentName: string;
  SubPaymentName: string;
  Amount: number;
}

export interface InvoiceDetail extends InvoiceHeader {
  Items: InvoiceItem[];
  Payments: InvoicePayment[];
}