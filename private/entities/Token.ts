import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity('tokens')
export class Token extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.tokens)
    @JoinColumn()
    owner: User;
    
    @Column({unique: true})
    value: string;

    @CreateDateColumn()
    created: Date;

    @Column({type: "integer", default: 4*60*60*1000})
    expires: number;
}