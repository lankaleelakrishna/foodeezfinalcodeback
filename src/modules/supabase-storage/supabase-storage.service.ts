import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private client: SupabaseClient;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'documents';
  }

  async onModuleInit() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || key === 'your-service-role-key-here') {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set correctly — Supabase Storage disabled',
      );
      return;
    }

    try {
      this.client = createClient(url, key, {
        auth: { persistSession: false },
      });
      await this.ensureBucketExists();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(
        'Supabase Storage client initialization failed. Check SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL.',
      );
      this.logger.error(`Supabase error: ${message}`);
      this.client = undefined as unknown as SupabaseClient;
    }
  }

  private async ensureBucketExists() {
    const { data: buckets } = await this.client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === this.bucket);
    if (!exists) {
      const { error } = await this.client.storage.createBucket(this.bucket, { public: true });
      if (error) {
        this.logger.error(`Failed to create bucket "${this.bucket}": ${error.message}`);
      } else {
        this.logger.log(`Created Supabase Storage bucket: ${this.bucket}`);
      }
    }
  }

  isReady(): boolean {
    return !!this.client;
  }

  async upload(remotePath: string, buffer: Buffer, mimetype: string): Promise<string> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(remotePath, buffer, { contentType: mimetype, upsert: true });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(remotePath);
    return data.publicUrl;
  }

  async delete(remotePath: string): Promise<void> {
    await this.client.storage.from(this.bucket).remove([remotePath]);
  }
}
