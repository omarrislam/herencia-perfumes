export const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const GENDER = ['men', 'women', 'unisex'] as const;
export type Gender = (typeof GENDER)[number];

export const CONCENTRATION = ['EDT', 'EDP', 'Extrait', 'Other'] as const;
export type Concentration = (typeof CONCENTRATION)[number];

export const PRODUCT_TYPE = ['perfume', 'bundle'] as const;
export type ProductType = (typeof PRODUCT_TYPE)[number];

export const BANNER_PLACEMENT = ['home_hero', 'home_strip', 'global_top'] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENT)[number];
