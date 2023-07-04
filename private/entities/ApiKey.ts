import { BaseEntity, Column, CreateDateColumn, DataSource, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity("api_keys")
export class ApiKey extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.tokens, { onDelete: "CASCADE"})
  @JoinColumn()
  owner: User;

  @Column({ unique: true })
  value: string;

  @CreateDateColumn({ type: "timestamptz" })
  created: Date;
  
}