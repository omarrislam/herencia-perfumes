export const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const GENDER = ['men', 'women', 'unisex'] as const;
export type Gender = (typeof GENDER)[number];

export const CONCENTRATION = ['EDT', 'EDP', 'Extrait', 'Other'] as const;
export type Concentration = (typeof CONCENTRATION)[number];

export const PRODUCT_TYPE = ['perfume', 'bundle', 'sample'] as const;
export type ProductType = (typeof PRODUCT_TYPE)[number];

// Reserved cart-line size label for per-perfume samples. A cart line
// { productId: <perfume>, sizeLabel: SAMPLE_SIZE_LABEL } is priced from
// settings.samples and stocked from Product.sampleStock.
export const SAMPLE_SIZE_LABEL = 'sample' as const;

export const BANNER_PLACEMENT = ['home_hero', 'home_strip', 'global_top'] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENT)[number];

export const PAYMENT_METHOD = ['cod', 'instapay'] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];
