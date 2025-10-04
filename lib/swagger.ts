// @ts-ignore
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'e Invoice API',
      version: '1.0.0',
      description: 'E-Invoice management system API',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? `http://138.199.208.103:3078${process.env.NEXT_PUBLIC_BASEPATH || ''}` 
          : `http://localhost:3000${process.env.NEXT_PUBLIC_BASEPATH || ''}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Session cookie obtained after login',
        },
      },
      schemas: {
        Invoice: {
          type: 'object',
          properties: {
            OrderKey: {
              type: 'string',
              format: 'uuid',
              description: 'Unique order identifier',
            },
            OrderID: {
              type: 'integer',
              description: 'Order ID number',
            },
            BranchName: {
              type: 'string',
              description: 'Branch name',
            },
            ExternalCode: {
              type: 'string',
              description: 'External branch code',
            },
            Type: {
              type: 'string',
              enum: ['E-FATURA', 'E-ARŞİV'],
              description: 'Document type',
            },
            InvoiceTotal: {
              type: 'number',
              format: 'decimal',
              description: 'Total invoice amount',
            },
            OrderDiscount: {
              type: 'number',
              format: 'decimal',
              description: 'Order discount amount',
            },
            InvoiceDate: {
              type: 'string',
              format: 'date-time',
              description: 'Invoice date',
            },
            CustomerName: {
              type: 'string',
              description: 'Customer name',
            },
            CustomerTaxNo: {
              type: 'string',
              description: 'Customer tax number',
            },
            CustomerTaxOffice: {
              type: 'string',
              description: 'Customer tax office',
            },
            CustomerEMail: {
              type: 'string',
              format: 'email',
              description: 'Customer email',
            },
            CustomerAddress: {
              type: 'string',
              description: 'Customer address',
            },
            RefNo: {
              type: 'string',
              description: 'Reference number',
            },
            UserCode: {
              type: 'string',
              description: 'User code',
            },
            UserType: {
              type: 'string',
              description: 'User type',
            },
            Items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InvoiceItem',
              },
            },
            Payments: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InvoicePayment',
              },
            },
          },
        },
        InvoiceItem: {
          type: 'object',
          properties: {
            TransactionKey: {
              type: 'string',
              format: 'uuid',
            },
            ItemCode: {
              type: 'string',
            },
            ItemsDefinition: {
              type: 'string',
            },
            TaxPercent: {
              type: 'integer',
            },
            Quantity: {
              type: 'number',
              format: 'decimal',
            },
            UnitPrice: {
              type: 'number',
              format: 'decimal',
            },
            Amount: {
              type: 'number',
              format: 'decimal',
            },
            DiscountTotal: {
              type: 'number',
              format: 'decimal',
            },
            IsMainCombo: {
              type: 'boolean',
            },
            MainTransactionKey: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
          },
        },
        InvoicePayment: {
          type: 'object',
          properties: {
            PaymentKey: {
              type: 'string',
              format: 'uuid',
            },
            PaymentName: {
              type: 'string',
            },
            SubPaymentName: {
              type: 'string',
            },
            Amount: {
              type: 'number',
              format: 'decimal',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'string',
              description: 'Error details',
            },
            type: {
              type: 'string',
              description: 'Error type',
            },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./app/api/**/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;