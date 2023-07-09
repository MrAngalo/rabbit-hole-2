import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { ApiUserToken } from "./ApiUserToken";

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

  @OneToMany(() => ApiUserToken, usertoken => usertoken.apikey, { nullable: true })
  usertokens: ApiUserToken[];
}