import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

export enum TokenType {
    VERIFY = 1,
}

@Entity('tokens')
export class Token extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.tokens)
    @JoinColumn()
    owner: User;

    @Column()
    session: string; /* used solely to prevent email spam */

    @Column({type: "enum", enum: TokenType})
    type: number;
    
    @Column({unique: true})
    value: string;

    @CreateDateColumn({type: 'timestamptz'})
    created: Date;

    @Column({type: "timestamptz", default: () => `now() + interval '2 hours'`})
    expires: Date;
}