export declare module JSONApi {

  export interface MetaObject {

  }
  
  export interface LinkObject {
    href: string;
    meta?: MetaObject
  }

  export interface LinksObject {
    self: string;
    [key: string]: string;
  }
  
  export interface AttributesObject {
    
  }
  
  export interface ResourceIdentifierObject {
    type: string;
    id: string;
    meta?: MetaObject;
  }
  
  export interface ToManyRelationshipsObject {
    links: LinksObject;
    data: ResourceIdentifierObject[];
    meta?: MetaObject;
  }
  
  export interface ToOneRelationshipsObject {
    links: LinksObject;
    data: ResourceIdentifierObject;
    meta?: MetaObject;
  }
  
  export interface RelationshipsDictionary {
    [index: string]: ToOneRelationshipsObject|ToManyRelationshipsObject;
  }
  
  export interface ResourceObject {
    links?: LinksObject;
    type: string;
    id: string;
    attributes?: AttributesObject;
    relationships?: RelationshipsDictionary;
  }

  export interface TopLevelDocument {
    links?: LinksObject;
    data?: ResourceObject|ResourceObject[];
    errors?: any;
    meta?: MetaObject;
    included?: ResourceObject[];
  }
}

export declare module UserResponse {

  export interface RelationshipsDictionary extends JSONApi.RelationshipsDictionary {
    team: JSONApi.ToOneRelationshipsObject
  }

  export interface AttributesObject extends JSONApi.AttributesObject {
    name: string
  }

  export interface ResourceObject extends JSONApi.ResourceObject {
    attributes: AttributesObject;
    relationships?: RelationshipsDictionary;
  }

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links: JSONApi.LinksObject;
    data: ResourceObject;
  }
  
}

export declare module UsersResponse {

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links: JSONApi.LinksObject;
    data: UserResponse.ResourceObject[];
  }
  
}

export declare module TeamResponse {

  export interface RelationshipsDictionary extends JSONApi.RelationshipsDictionary {
    members: JSONApi.ToManyRelationshipsObject
  }

  export interface AttributesObject extends JSONApi.AttributesObject {
    name: string
  }

  export interface ResourceObject extends JSONApi.ResourceObject {
    attributes: AttributesObject;
    relationships?: RelationshipsDictionary;
  }

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links: JSONApi.LinksObject;
    data: ResourceObject;
  }

}