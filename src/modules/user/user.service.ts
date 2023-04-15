import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User_Follow_Comic } from './user_follow/user_follow.entity';
import { User_Like_Comic } from './user_like/user-like.entity';
import { IUser } from './user.interface';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(User_Follow_Comic)
    private userFollowComicRepository: Repository<User_Follow_Comic>,
    @InjectRepository(User_Like_Comic)
    private userLikeComicRepository: Repository<User_Like_Comic>,
  ) {}

  async getAll() {
    return await this.userRepository.find();
  }

  async getUserByEmail(email: string) {
    return await this.userRepository.findOne({
      where: {
        email,
      },
    });
  }

  async getUserById(id: any) {
    return await this.userRepository.findOne({
      where: {
        id,
      },
    });
  }

  async updateActive(email: any) {
    const user = await this.getUserByEmail(email);
    return await this.userRepository.save({
      ...user,
      active: true,
    });
  }

  async updatePassword(email: string, new_password: string) {
    // hash password
    const salt = await bcrypt.genSalt(10);
    const hash_password = await bcrypt.hash(new_password, salt);

    return await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ password: hash_password })
      .where('email = :email', { email: email })
      .execute();
  }

  async followComic(id_user: number, id_comic: number) {
    return await this.userFollowComicRepository.save({
      id_user,
      id_comic,
    });
  }

  async likeComic(id_user: number, id_comic: number) {
    return await this.userLikeComicRepository.save({
      id_user,
      id_comic,
    });
  }

  async isFollowComic(id_user: number, id_comic: number) {
    return await this.userFollowComicRepository.findOne({
      where: {
        id_user: id_user,
        id_comic: id_comic,
      },
    });
  }

  async isLikeComic(id_user: number, id_comic: number) {
    return await this.userLikeComicRepository.findOne({
      where: {
        id_user: id_user,
        id_comic: id_comic,
      },
    });
  }

  async unfollowComic(id_user: number, id_comic: number) {
    return this.userFollowComicRepository.delete({
      id_user: id_user,
      id_comic: id_comic,
    });
  }

  async unlikeComic(id_user: number, id_comic: number) {
    return this.userLikeComicRepository.delete({
      id_user: id_user,
      id_comic: id_comic,
    });
  }

  async update(id_user: number, data_update: IUser) {
    return this.userRepository.save({
      id: id_user,
      ...data_update,
    });
  }

  async checkFollowing(id_user: number, id_comic: number) {
    return await this.userFollowComicRepository.findOne({
      where: {
        id_user: id_user,
        id_comic: id_comic,
      },
    });
  }
}
