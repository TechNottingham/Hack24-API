declare module "@slack/client" {
  interface Field {
    value: string;
    alt: string;
  }

  interface Profile {
    first_name: string;
    last_name: string;
    avatar_hash: string;
    real_name: string;
    real_name_normalized: string;
    email: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
    fields: { [name: string]: Field };
  }

  interface User {
    id: string;
    team_id: string;
    name: string;
    deleted: boolean;
    color: string;
    real_name: string;
    tz: string;
    tz_label: string;
    tz_offset: number;
    profile: Profile;
    is_admin: boolean;
    is_owner: boolean;
    is_primary_owner: boolean;
    is_restricted: boolean;
    is_ultra_restricted: boolean;
    is_bot: boolean;
    presence: string;
  }

  interface Channel {
    id: string;
    name: string;
    is_channel: boolean;
    created: 1426851129;
    creator: string;
    is_archived: boolean;
    is_general: boolean;
    has_pins: boolean;
    is_member: boolean;
  }

  interface Message {
    type: string;
    user: string;
    text: string;
    ts: string;
  }

  interface Group {
    id: string;
    name: string;
    is_group: boolean;
    created: number;
    creator: string;
    is_archived: boolean;
    is_mpim: boolean;
    has_pins: boolean;
    is_open: boolean;
    last_read: string;
    latest: Message;
    unread_count: number;
    unread_count_display: number;
    members: string[];
    topic: {
      value: string;
      creator: string;
      last_set: number;
    };
    purpose: {
      value: string;
      creator: string;
      last_set: number;
    }
  }

  interface DirectMessage {
    id: string;
    user: string;
    created: number;
    is_im: boolean;
    is_org_shared: boolean;
    has_pins: boolean;
    last_read: string;
    latest: Message;
    unread_count: number;
    unread_count_display: number;
    is_open: boolean;
  }

  interface Bot {
    id: string;
    deleted: boolean;
    name: string;
    icons: {
      image_36: string;
      image_48: string;
      image_72: string;
    };
  }

  interface TeamPreferences {
    default_channels: string[];
    who_can_manage_integrations: {
      type: string[]
    };
    commands_only_regular: boolean;
    posts_migrating: number;
    allow_calls: boolean;
    hide_referers: boolean;
    msg_edit_window_mins: number;
    allow_message_deletion: boolean;
    calling_app_name: string;
    display_real_names: boolean;
    who_can_at_everyone: string;
    who_can_at_channel: string;
    who_can_create_channels: string;
    who_can_archive_channels: string;
    who_can_create_groups: string;
    who_can_post_general: string;
    who_can_kick_channels: string;
    who_can_kick_groups: string;
    retention_type: number;
    retention_duration: number;
    group_retention_type: number;
    group_retention_duration: number;
    dm_retention_type: number;
    dm_retention_duration: number;
    file_retention_duration: number;
    file_retention_type: number;
    allow_retention_override: boolean;
    require_at_for_mention: boolean;
    default_rxns: string[];
    team_handy_rxns: {
      restrict: boolean;
      list: {
        name: string;
        title: string;
      }[];
    };
    compliance_export_start: number;
    warn_before_at_channel: string;
    disallow_public_file_urls: boolean;
    who_can_create_delete_user_groups: string;
    who_can_edit_user_groups: string;
    who_can_change_team_profile: string;
    allow_shared_channels: boolean;
    display_email_addresses: boolean;
    who_has_team_visibility: string;
    invites_only_admins: boolean;
    disable_file_uploads: string;
    disable_file_editing: boolean;
    disable_file_deleting: boolean;
    who_can_create_shared_channels: string;
    who_can_manage_shared_channels: {
      type: string[];
    };
    who_can_post_in_shared_channels: {
      type: string[];
    };
    allow_shared_channel_perms_override: boolean;
    dnd_enabled: boolean;
    dnd_start_hour: string;
    dnd_end_hour: string;
    auth_mode: string;
    invites_limit: boolean;
  }

  interface Team {
    id: string;
    name: string;
    email_domain: string;
    domain: string;
    msg_edit_window_mins: number;
    prefs: TeamPreferences;
    icon: {
      image_34: string;
      image_44: string;
      image_68: string;
      image_88: string;
      image_102: string;
      image_132: string;
      image_original: string;
      image_230: string;
    };
    over_storage_limit: boolean;
    plan: string;
    over_integrations_limit: boolean;
  }

  class MemoryDataStore {
    clear(): void;

    getUserById(userId: string): User;
    getUserByName(name: string): User;
    getUserByEmail(email: string): User;
    getUserByBotId(email: string): User;
    getChannelById(channelId: string): Channel;
    getChannelByName(name: string): Channel;
    getGroupById(groupId: string): Group;
    getGroupByName(name: string): Group;
    getDMById(dmId: string): DirectMessage;
    getDMByName(name: string): DirectMessage;
    getBotById(botId: string): Bot;
    getBotByName(name: string): Bot;
    getBotByUserId(userId: string): Bot;
    getTeamById(teamId: string): Team;
    getUnreadCount(): number;

    setChannel(channel: Channel): void;
    setGroup(group: Group): void;
    setDM(dm: DirectMessage): void;
    setUser(user: User): void;
    setBot(bot: Bot): void;
    setTeam(team: Team): void;

    upsertChannel(channel: Channel): void;
    upsertGroup(group: Group): void;
    upsertDM(dm: DirectMessage): void;
    upsertUser(user: User): void;
    upsertBot(bot: Bot): void;
    upsertTeam(team: Team): void;

    removeChannel(channel: Channel): void;
    removeGroup(group: Group): void;
    removeDM(dm: DirectMessage): void;
    removeUser(user: User): void;
    removeBot(bot: Bot): void;
    removeTeam(team: Team): void;
  }

  interface ClientOptions {
    socketFn?: (socketUrl: string, opts: { proxyURL?: string }) => any;
    dataStore?: any;
    autoReconnect?: boolean;
    maxReconnectionAttempts?: number;
    reconnectionBackoff?: number;
    wsPingInterval?: number;
    maxPongInterval?: number;
    logLevel?: string;
    logger?: (logLevel: string, logString: string) => void;
    slackAPIUrl?: string;
  }

  interface BaseAPIClient {
    slackAPIUrl: string;
    userAgent: string;
    dataStore: MemoryDataStore;
    transport: (args: any, cb: Function) => void;

    emit(...args: any[]): void;
    registerDataStore(dataStore: any): void;
  }

  class RtmClient implements BaseAPIClient {
    constructor(token: string, opts?: ClientOptions);

    slackAPIUrl: string;
    userAgent: string;
    dataStore: MemoryDataStore;
    transport: (args: any, cb: Function) => void;

    emit(...args: any[]): void;
    registerDataStore(dataStore: any): void;
  }

  class WebClient implements BaseAPIClient {
    constructor(token: string, opts?: ClientOptions);

    slackAPIUrl: string;
    userAgent: string;
    dataStore: MemoryDataStore;
    transport: (args: any, cb: Function) => void;

    emit(...args: any[]): void;
    registerDataStore(dataStore: any): void;

    users: UsersApi;
  }

  interface UsersListResponse {
    ok: boolean;
    members: User[];
  }

  interface UsersInfoResponse {
    ok: boolean;
    user: User;
  }

  interface UsersApi {
    list(opts: any, optCb: (err: any, response: UsersListResponse) => void): void;
    list(optCb: (err: any, response: UsersListResponse) => void): void;
    list(opts?: any): Promise<UsersListResponse>;
    
    info(user: string, optCb: (err: any, response: UsersInfoResponse) => void): void;
    info(user: string): Promise<UsersInfoResponse>;
  }

  class IncomingWebhook {}

  class LegacyRtmClient {}

  var CLIENT_EVENTS: {
    WEB: string;
    RTM: string;
  };
  var RTM_EVENTS: {};
  var RTM_MESSAGE_SUBTYPES: {};
}
