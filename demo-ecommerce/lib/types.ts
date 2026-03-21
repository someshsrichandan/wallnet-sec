export type FormulaMode = "SALT_ADD" | "POSITION_SUM" | "PAIR_SUM";
export type AlphabetMode = "SEQUENTIAL" | "RANDOM";
export type CatalogType = "VEGETABLE" | "CRICKETER" | "BOLLYWOOD";

export type VisualProfile = {
    catalogType: CatalogType;
    secretVegetables: string[];
    secretLetters: string[];
    formulaMode: FormulaMode;
    alphabetMode: AlphabetMode;
    saltValue: number;
    positionPair: number[];
};

export type DemoShopUser = {
    id: string;
    partnerUserId: string;
    fullName: string;
    email: string;
    passwordHash: string;
    visualEnabled: boolean;
    visualProfile?: VisualProfile;
    createdAt: string;
    updatedAt: string;
};

export type DemoShopSession = {
    userId: string;
    partnerUserId: string;
    email: string;
    fullName: string;
};

export type InitAuthResponse = {
    sessionToken: string;
    expiresAt: string;
    verifyPath: string;
};

export type ConsumeResultResponse = {
    result: "PASS";
    sessionToken: string;
    partnerId: string;
    userId: string;
    state: string;
    consumedAt: string;
};

export type InitEnrollResponse = {
    enrollToken: string;
    enrollPath: string;
    expiresAt: string;
    partnerId: string;
    userId: string;
};

export type PendingVisualLogin = {
    loginId: string;
    state: string;
    sessionToken: string;
    partnerId: string;
    partnerUserId: string;
    email: string;
    userId: string;
    fullName: string;
};
