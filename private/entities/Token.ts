import { BaseEntity, Column, CreateDateColumn, DataSource, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

export enum TokenType {
  NONE = 0,
  VERIFY = 1,
  PW_RESET = 2,
}

@Entity("tokens")
export class Token extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.tokens, { onDelete: "CASCADE"})
  @JoinColumn()
  owner: User;

  @Column()
  session: string; /* used solely to prevent email spam */

  @Column({ type: "enum", enum: TokenType })
  type: number;

  @Column({ unique: true })
  value: string;

  @CreateDateColumn({ type: "timestamptz" })
  created: Date;

  @Column({ type: "timestamptz", default: () => `now() + interval '2 hours'` })
  expires: Date;

  public static async validate (dataSource: DataSource, token_val: string, userid: number, cb?: (token: Token) => any) {
    //should always have at most one element, but it uses getMany() for flexibility
    const token = await dataSource.getRepository(Token)
      .createQueryBuilder("token")
      .select([
        "token.id",
        "token.ownerId",
        "token.expires",
        "token.value"
      ])
      .where("token.value = :value", { value: token_val })
      .andWhere("token.expires > now()")
      .andWhere("token.ownerId = :userid", { userid })
      .getOne();

    if (token == null) return false;
    if (cb != undefined) await cb(token);
    
    return true;
  };
}