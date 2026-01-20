import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CloudinaryService } from '@tungle/core/services/cloudinary.service';
import { NotiService } from '@tungle/core/services/noti.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  selectedFile: File | null = null;
  imgUrl: string | null = null;
  isLoading = false;

  @Input() imgUrlInput: string | null = null; // image url ở trạng thái view
  @Input() mode: 0 | 1 | 2 = 0; // 0: create; 1: update; 2: view

  @Output() upload = new EventEmitter<IUploadRes>();

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['imgUrlInput']) {
      if (this.mode === 1 || this.mode === 2) {
        this.imgUrl = this.imgUrlInput;
      }
    }
  }

  constructor(private cloudinaryService: CloudinaryService, private notiService: NotiService) {}

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.type || '')) {
        this.notiService.error('Chỉ hỗ trợ file ảnh (JPEG, PNG, GIF, WebP)');
        return;
      }

      // Validate file size (10MB max)
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxFileSize) {
        this.notiService.error('Kích thước file không được vượt quá 10MB');
        return;
      }

      this.selectedFile = file;
      this.uploadImage();
    }
  }

  uploadImage(): void {
    if (!this.selectedFile) return;

    this.isLoading = true;
    this.upload.emit({
      isLoading: this.isLoading,
      imgUrl: null
    });

    this.cloudinaryService.uploadImage(this.selectedFile).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.imgUrl = response.data.secure_url;
          this.isLoading = false;
          this.upload.emit({
            isLoading: this.isLoading,
            imgUrl: response.data.secure_url
          });
          this.notiService.success('Tải ảnh lên thành công');
        }
      },
      error: (err) => {
        console.error('Upload failed:', err);
        this.isLoading = false;
        this.upload.emit({
          isLoading: this.isLoading,
          imgUrl: null
        });
        this.notiService.error(err?.error?.message || 'Lỗi khi tải ảnh lên');
      }
    });
  }

  clearImage() {
    this.imgUrl = null;
    this.selectedFile = null;
    this.upload.emit({
      isLoading: this.isLoading,
      imgUrl: null
    });
  }
}

export interface IUploadRes {
  isLoading: boolean;
  imgUrl: string | null;
}
