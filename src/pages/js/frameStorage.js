import { supabase } from "../../supabaseClient"; // ← sesuaikan path ke client milikmu

const BUCKET = "photobooth-frames";
const TABLE = "photobooth_frames";

export const frameStorage = {
  async list() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;

    // satu bingkai gagal diunduh tidak menggagalkan yang lain
    const settled = await Promise.allSettled(
      data.map(async (r) => {
        const { data: blob, error: e } = await supabase.storage.from(BUCKET).download(r.path);
        if (e) throw e;
        return { id: r.id, name: r.name, w: r.width, h: r.height, slots: r.slots, blob };
      })
    );
    return settled.filter((x) => x.status === "fulfilled").map((x) => x.value);
  },

  async save(f) {
    const path = `${f.id}.png`;

    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, f.blob, { contentType: "image/png", upsert: true });
    if (up.error) throw up.error;

    const ins = await supabase.from(TABLE).insert({
      id: f.id,
      name: f.name,
      width: f.w,
      height: f.h,
      slots: f.slots,
      path,
    });
    if (ins.error) {
      // jangan tinggalkan file yatim di bucket
      await supabase.storage.from(BUCKET).remove([path]);
      throw ins.error;
    }
  },

  async remove(id) {
    const del = await supabase.from(TABLE).delete().eq("id", id);
    if (del.error) throw del.error;
    await supabase.storage.from(BUCKET).remove([`${id}.png`]);
  },
};