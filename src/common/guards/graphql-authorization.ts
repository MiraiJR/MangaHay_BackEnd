import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class GraphqlJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = GqlExecutionContext.create(context).getContext().req;

    const authHeader = request.header('Authorization');
    const jwtToken = authHeader && authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verify(jwtToken, {
        secret: process.env.ACCESSTOKEN_KEY,
      });
      const curUser = await this.userService.getUserById(payload.idUser);

      if (jwtToken !== curUser) {
        return false;
      }

      if (curUser) {
        request.idUser = payload.idUser;
      }

      return curUser ? true : false;
    } catch (error) {
      // trường hợp jwt token hết hạn
      return false;
    }
  }
}
