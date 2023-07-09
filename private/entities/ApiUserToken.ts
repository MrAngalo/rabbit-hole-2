import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { ApiKey } from "./ApiKey";

@Entity("api_user_token")
export class ApiUserToken extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ApiKey, apikey => apikey.usertokens, { onDelete: "CASCADE", nullable: false })
  @JoinColumn()
  apikey: ApiKey;

  @ManyToOne(() => User, user => user.apitokens, { onDelete: "CASCADE", nullable: false })
  @JoinColumn()
  user: User;

  @Column({ unique: true })
  value: string;

  @CreateDateColumn({ type: "timestamptz" })
  created: Date;

  @Column({ type: "timestamptz", default: () => `now() + interval '2 hours'` })
  expires: Date;
}