declare module "mongoose" {
  export interface Document {
    save<T>(): Promise<void>;
  }
}