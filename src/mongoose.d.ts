declare module "mongoose" {
  export interface Document {
    save<T>(): Promise<void>;
  }
  export interface PopulateOption {
    populate?: PopulateOption;
  }
}