import axios from "axios";
import { AppDataSource } from "../../config/data-source";
import { Post } from "./post.entity";

interface JsonPlaceholderPost {
  userId: number;
  id: number;
  title: string;
  body: string;
}

export class ExternalService {
  private postRepository = AppDataSource.getRepository(Post);
  private apiUrl =
    process.env.EXTERNAL_API_URL || "https://jsonplaceholder.typicode.com";

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  private summarize(body: string, max = 80): string {
    const clean = body.replace(/\n/g, " ").trim();
    return clean.length <= max ? clean : clean.slice(0, max) + "...";
  }

  async getTransformedPosts() {
    const { data } = await axios.get<JsonPlaceholderPost[]>(
      `${this.apiUrl}/posts`
    );

    const transformed = data.slice(0, 10).map((post) => ({
      id: post.id,
      userId: post.userId,
      title: post.title,
      summary: this.summarize(post.body),
      slug: this.slugify(post.title),
    }));

    return transformed;
  }

  async fetchAndSavePosts() {
    const transformed = await this.getTransformedPosts();

    await this.postRepository.clear();

    const entities = transformed.map((p) =>
      this.postRepository.create({
        externalId: p.id,
        userId: p.userId,
        title: p.title,
        summary: p.summary,
        slug: p.slug,
      })
    );

    await this.postRepository.save(entities);
    return entities;
  }

  async getStoredPosts() {
    return this.postRepository.find({ order: { externalId: "ASC" } });
  }
}
