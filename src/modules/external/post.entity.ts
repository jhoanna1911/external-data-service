import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("posts")
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  externalId!: number;

  @Column()
  userId!: number;

  @Column()
  title!: string;

  @Column("text")
  summary!: string;

  @Column()
  slug!: string;

  @CreateDateColumn()
  fetchedAt!: Date;
}