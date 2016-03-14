export declare module JSONApi {

  export interface MetaObject {

  }
  
  export interface LinkObject {
    href: string;
    meta?: MetaObject
  }

  export interface LinksObject {
    self?: string;
  }
  
  export interface AttributesObject {
    
  }
  
  export interface ResourceIdentifierObject {
    type: string;
    id: string;
    meta?: MetaObject;
  }
  
  export interface ToManyRelationshipsObject {
    links?: LinksObject;
    data: ResourceIdentifierObject[];
    meta?: MetaObject;
  }
  
  export interface ToOneRelationshipsObject {
    links?: LinksObject;
    data: ResourceIdentifierObject;
    meta?: MetaObject;
  }
  
  export interface RelationshipsDictionary {
    [index: string]: ToOneRelationshipsObject|ToManyRelationshipsObject;
  }
  
  export interface ResourceObject {
    links?: LinksObject;
    type: string;
    id?: string;
    attributes?: AttributesObject;
    relationships?: RelationshipsDictionary;
  }
  
  export interface ErrorObject {
    id?: string;
    links?: LinksObject;
    status?: string;
    code?: string;
    title?: string;
    detail?: string;
    source?: string;
    meta?: MetaObject;
  }

  export interface TopLevelDocument {
    links?: LinksObject;
    data?: ResourceObject|ResourceObject[];
    errors?: ErrorObject[]  ;
    meta?: MetaObject;
    included?: ResourceObject[];
  }
}

export declare module UserResource {

  export interface RelationshipsDictionary extends JSONApi.RelationshipsDictionary {
    team: JSONApi.ToOneRelationshipsObject
  }

  export interface AttributesObject extends JSONApi.AttributesObject {
    name: string
  }

  export interface ResourceObject extends JSONApi.ResourceObject {
    attributes?: AttributesObject;
    relationships?: RelationshipsDictionary;
  }

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links?: JSONApi.LinksObject;
    data: ResourceObject;
  }
  
}

export declare module UsersResource {

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links: JSONApi.LinksObject;
    data: UserResource.ResourceObject[];
  }
  
}

export declare module TeamResource {

  export interface RelationshipsDictionary extends JSONApi.RelationshipsDictionary {
    members: JSONApi.ToManyRelationshipsObject
  }

  export interface AttributesObject extends JSONApi.AttributesObject {
    name: string;
    motto: string;
  }

  export interface ResourceObject extends JSONApi.ResourceObject {
    attributes?: AttributesObject;
    relationships?: RelationshipsDictionary;
  }

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links?: JSONApi.LinksObject;
    data: ResourceObject;
  }

}

export declare module TeamsResource {

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links?: JSONApi.LinksObject;
    data: TeamResource.ResourceObject[];
  }
  
}

export declare module TeamMembersRelationship {

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links?: JSONApi.LinksObject;
    data: JSONApi.ResourceIdentifierObject[];
  }
  
}

export declare module AttendeeResource {

  export interface AttributesObject extends JSONApi.AttributesObject {
    emailaddress: string
  }

  export interface ResourceObject extends JSONApi.ResourceObject {
    attributes?: AttributesObject;
  }

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links?: JSONApi.LinksObject;
    data: ResourceObject;
  }
  
}

export declare module AttendeesResource {

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    links?: JSONApi.LinksObject;
    data: AttendeeResource.ResourceObject[];
  }
  
}

export declare module Root {

  export interface TopLevelDocument extends JSONApi.TopLevelDocument {
    jsonapi: {
      version: string;
    },
    links: {
      self: string;
      teams: JSONApi.LinkObject;
      users: JSONApi.LinkObject;
      attendees: JSONApi.LinkObject;
    }
  }
  
}
