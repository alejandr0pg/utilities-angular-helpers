import { Injectable } from "@angular/core";
import { SupabaseClient } from "@supabase/supabase-js";
import supabase from "../helpers/supabase-client";

type UploadOptions = {
  filePath: string;
  file: File;
  bucket?: string;
};

@Injectable({
  providedIn: "root",
})
export class StorageService {
  private supabase: SupabaseClient = supabase;

  upload({ filePath, file, bucket = "files" }: UploadOptions) {
    return this.supabase.storage.from(bucket).upload(filePath, file, {
      upsert: false,
    });
  }

  download(filePath: string, bucket: string = "files") {
    return this.supabase.storage.from(bucket).download(filePath);
  }

  remove(filePath: string, bucket: string = "files") {
    return this.supabase.storage.from(bucket).remove([filePath]);
  }

  getPublicUrl(filePath: string, bucket: string = "files") {
    return this.supabase.storage.from(bucket).getPublicUrl(filePath);
  }
}
