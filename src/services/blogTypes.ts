export interface BlogImage {
  secure_url: string;
  [key: string]: unknown;
}

export interface BlogPayload {
  title: string;
  description: string;
  titleImages: BlogImage[];
  photos: BlogImage[];
  keywords: string;
  notes: string;
  category: string;
  product: string;
  brand: string;
  ratings: number;
  numberOfReviews: number;
  [key: string]: unknown;
}

export interface Blog extends BlogPayload {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}
