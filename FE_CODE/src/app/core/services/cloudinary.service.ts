import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private readonly API_URL = `${environment.API_URL}/api/upload`;

  constructor(private http: HttpClient) {}

  /**
   * Upload image to Cloudinary via backend
   * @param file - Image file to upload
   * @returns Observable with upload response
   */
  uploadImage(file: File): Observable<IUploadImageRes> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<IUploadImageRes>(`${this.API_URL}/image`, formData);
  }

  /**
   * Delete image from Cloudinary
   * @param publicId - Public ID of the image to delete
   * @returns Observable with delete response
   */
  deleteImage(publicId: string): Observable<IDeleteImageRes> {
    return this.http.post<IDeleteImageRes>(`${this.API_URL}/delete`, { publicId });
  }

  /**
   * Get image metadata
   * @param publicId - Public ID of the image
   * @returns Observable with image metadata
   */
  getImageMetadata(publicId: string): Observable<IGetMetadataRes> {
    return this.http.get<IGetMetadataRes>(`${this.API_URL}/metadata/${publicId}`);
  }
}

/**
 * Response interface for upload image endpoint
 */
export interface IUploadImageRes {
  success: boolean;
  message: string;
  data: ICloudinaryImgUploadRes;
}

/**
 * Response interface for delete image endpoint
 */
export interface IDeleteImageRes {
  success: boolean;
  message: string;
  data: any;
}

/**
 * Response interface for get metadata endpoint
 */
export interface IGetMetadataRes {
  success: boolean;
  message: string;
  data: any;
}

/**
 * Cloudinary image upload response data
 */
export interface ICloudinaryImgUploadRes {
  asset_id: string;
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
}
