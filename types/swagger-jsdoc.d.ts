declare module 'swagger-jsdoc' {
  export interface Options {
    definition: {
      openapi: string;
      info: {
        title: string;
        version: string;
        description?: string;
      };
      servers?: Array<{
        url: string;
        description?: string;
      }>;
      components?: any;
      security?: any[];
    };
    apis: string[];
  }

  function swaggerJSDoc(options: Options): any;
  export default swaggerJSDoc;
}