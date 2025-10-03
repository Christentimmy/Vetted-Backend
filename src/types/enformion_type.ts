

// ==================== INTERFACES ====================

// Base Config
export interface EnformionConfig {
  apName: string;
  apPassword: string;
  baseURL?: string;
}

// Error Response
export interface EnformionError {
  success: false;
  error: string;
  statusCode?: number;
  details?: any;
}

// Success Response Wrapper
export interface EnformionSuccess<T> {
  success: true;
  data: T;
}

export type EnformionResponse<T> = EnformionSuccess<T> | EnformionError;

// ==================== REVERSE PHONE SEARCH ====================

export interface ReversePhoneSearchRequest {
  Phone: string;
  Page?: number;
  ResultsPerPage?: number;
}

export interface ReversePhoneAddress {
  HouseNumber: string;
  StreetPreDirection: string;
  StreetName: string;
  StreetPostDirection: string;
  StreetType: string;
  Unit: string;
  UnitType: string | null;
  City: string;
  State: string;
  Zip: string;
  Zip4: string;
  FullAddress: string;
}

export interface ReversePhoneName {
  Prefix: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
}

export interface ReversePhoneSearchResponse {
  PhoneNumber: string;
  Addresses: ReversePhoneAddress[];
  Names: ReversePhoneName[];
  Carrier: string;
  PhoneType: string;
  TimeZone: string;
  Latitude: string;
  Longitude: string;
  RecordId: string;
  DataSource: string;
  SecondaryDataSource: string | null;
  FirstReportedDate: string;
  LastReportedDate: string;
  FullRecord: any | null;
}

// ==================== CALLER ID (PHONE ENRICH) ====================

export interface CallerIdRequest {
  Phone: string;
}

export interface CallerIdAddress {
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  firstReportedDate: string;
  lastReportedDate: string;
}

export interface CallerIdPhone {
  number: string;
  type: string;
  isConnected: boolean;
  firstReportedDate: string;
  lastReportedDate: string;
}

export interface CallerIdEmail {
  email: string;
}

export interface CallerIdResponse {
  person: {
    name: {
      firstName: string;
      middleName: string;
      lastName: string;
    };
    age: string;
    addresses: CallerIdAddress[];
    phones: CallerIdPhone[];
    emails: CallerIdEmail[];
  };
}

// ==================== PERSON SEARCH ====================

export interface PersonSearchRequest {
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Addresses?: Array<{
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    State?: string;
    Zip?: string;
  }>;
  Dob?: string;
  Phone?: string;
  Email?: string;
  Includes?: string[];
  FilterOptions?: string[];
  Page?: number;
  ResultsPerPage?: number;
}

export interface PersonSearchName {
  Prefix: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
  PublicFirstSeenDate: string;
  TotalFirstSeenDate: string;
  SourceSummary: any;
}

export interface PersonSearchAddress {
  IsDeliverable: boolean;
  IsMergedAddress: boolean;
  IsPublic: boolean;
  AddressQualityCodes: string[];
  AddressHash: string;
  HouseNumber: string;
  StreetPreDirection: string;
  StreetName: string;
  StreetPostDirection: string;
  StreetType: string;
  Unit: string;
  UnitType: string | null;
  City: string;
  State: string;
  County: string;
  Zip: string;
  Zip4: string;
  Latitude: string;
  Longitude: string;
  AddressOrder: number;
  HighRiskMarker: {
    IsHighRisk: boolean;
    Sic: string;
    AddressType: string;
  };
  FirstReportedDate: string;
  LastReportedDate: string;
  PublicFirstSeenDate: string;
  TotalFirstSeenDate: string;
  PhoneNumbers: string[];
  Neighbors: any[];
  NeighborSummaryRecords: any[];
  FullAddress: string;
  SourceSummary: any;
}

export interface PersonSearchPhone {
  PhoneNumber: string;
  Company: string;
  Location: string;
  PhoneType: string;
  IsConnected: boolean;
  IsPublic: boolean;
  Latitude: string;
  Longitude: string;
  PhoneOrder: number;
  FirstReportedDate: string;
  LastReportedDate: string;
  PublicFirstSeenDate: string | null;
  TotalFirstSeenDate: string;
  SourceSummary: any;
}

export interface PersonSearchEmail {
  EmailAddress: string;
  EmailOrdinal: number;
  SourceSummary: any;
}

export interface PersonSearchRelative {
  TahoeId: string;
  Prefix: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
  Dob: string;
  RelativeLevel: string;
  RelativeType: string;
  Spouse: number;
  SharedHouseholdIds: string[];
  Score: number;
}

export interface PersonSearchResponse {
  TahoeId: string;
  Name: PersonSearchName;
  IsPublic: boolean;
  IsOptedOut: boolean;
  SparseFlag: number;
  Dob: string;
  Age: number;
  DatesOfBirth: Array<{ Age: number; SourceSummary: any }>;
  DatesOfDeath: any[];
  DeathRecords: {
    IsDeceased: boolean;
    SourceSummary: any;
  };
  Akas: PersonSearchName[];
  MergedNames: PersonSearchName[];
  Locations: Array<{ City: string; State: string }>;
  Addresses: PersonSearchAddress[];
  PhoneNumbers: PersonSearchPhone[];
  EmailAddresses: PersonSearchEmail[];
  RelativesSummary: PersonSearchRelative[];
  AssociatesSummary: any[];
  FullName: string;
  Indicators: {
    HasBankruptcyRecords: number;
    HasBusinessRecords: number;
    HasDivorceRecords: number;
    HasDomainsRecords: number;
    HasEvictionsRecords: number;
    HasFeinRecords: number;
    HasForeclosuresRecords: number;
    HasJudgmentRecords: number;
    HasLienRecords: number;
    HasMarriageRecords: number;
    HasProfessionalLicenseRecords: number;
    HasPropertyRecords: number;
    HasVehicleRegistrationsRecords: number;
    HasWorkplaceRecords: number;
    HasDeaRecords: number;
  };
}

// ==================== ID VERIFICATION ====================

export interface IdVerificationRequest {
  FirstName: string;
  LastName: string;
  Address: {
    addressLine1: string;
    addressLine2: string;
  };
  MiddleName?: string;
  Dob?: string;
  Phone?: string;
  Email?: string;
}

export interface MatchField<T> {
  value: T;
  matchTypeCode: 'Match' | 'Partial' | 'Mismatch' | 'NA';
}

export interface VerifiedPerson {
  identityScore: number;
  firstName: MatchField<string>;
  middleName: MatchField<string>;
  lastName: MatchField<string>;
  dob: {
    month: MatchField<string>;
    day: MatchField<string>;
    year: MatchField<string>;
  };
  age: MatchField<string>;
  addresses: MatchField<string>[];
  emails: MatchField<string>[];
  phones: MatchField<string>[];
}

export interface IdVerificationResponse {
  verifiedPeople: VerifiedPerson[];
  identityVerified: boolean;
}

// ==================== CRIMINAL SEARCH ====================

export interface CriminalSearchRequest {
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  City?: string;
  State?: string;
  Dob?: string;
  Page?: number;
  ResultsPerPage?: number;
}

export interface CriminalName {
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string | null;
  TahoeId: string | null;
  Ssn: string | null;
  NameHash: number;
  NameScore: number;
  SourceMap: any;
  FullName: string;
}

export interface OffenderAttribute {
  Dob: string;
  Age: number | null;
  BirthState: string | null;
  Hair: string;
  Eye: string;
  Height: string;
  Weight: string;
  Race: string;
  Sex: string;
  SkinTone: string | null;
  MilitaryService: string | null;
  ScarsMarks: string;
  SourceMap: any;
  NameHashes: number[];
}

export interface CriminalPhoto {
  SourceMap: string;
  SourceState: string;
  PhotoName: string;
  NameHashes: number[];
}

export interface CriminalAddress {
  Attention: string;
  HouseNumber: string;
  StreetDirection: string;
  StreetName: string;
  StreetType: string;
  StreetPostDirection: string;
  UnitType: string;
  UnitNumber: string;
  City: string;
  State: string;
  ZipCode: string;
  Zip4: string;
  County: string;
  Longitude: string;
  Latitude: string;
  RawVerificationCodes: string;
  AddressHash: any;
  SourceMap: any;
  NameHashes: number[];
  FullAddress: string;
}

export interface CaseDetail {
  CaseNumber: string;
  CaseType: string | null;
  RawCategory: string;
  MappedCategory: string;
  NCICcode: string | null;
  Source: string;
  CourtType: string | null;
  Court: string | null;
  CourtCounty: string | null;
  Fees: string | null;
  Fines: string | null;
  CaseDate: string | null;
  SourceMap: string;
}

export interface Offense {
  OffenseCodes: string[];
  Photos: string[];
  OffenseDescription: string[];
  OffenseDate: string | null;
  ChargesFiledDate: string | null;
  SourceCounty: string | null;
  SourceState: string;
  ConvictionDate: string | null;
  ConvictionPlace: string | null;
  Disposition: string | null;
  DispositionDate: string;
  Sentenced: string | null;
  ProbationDate: string | null;
  SourceMap: string;
  ClassificationCodeDescription: string;
  ClassificationSubCodeDescription: string | null;
}

export interface CriminalImage {
  ImageBase64: string | null;
  ImageFileName: string;
  ImageFileType: string;
  ImageUrl: string;
  ThumbUrl: string;
  PicWidth: number;
  PicHeight: number;
  ThumbWidth: number;
  ThumHeight: number;
}

export interface CriminalRecord {
  PoseidonId: number;
  ShortCat: string;
  Names: CriminalName[];
  OffenderAttributes: OffenderAttribute[];
  Photos: CriminalPhoto[];
  Addresses: CriminalAddress[];
  CaseDetails: CaseDetail[];
  Offenses: Offense[];
  Others: any[];
  Images: CriminalImage[];
}

export interface CriminalSearchResponse {
  CriminalRecords: CriminalRecord[];
}




