import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ComicService } from './comic.service';
import { Response } from 'express';
import { ChapterService } from '../chapter/chapter.service';
import { JwtAuthorizationd } from 'src/common/guards/jwt-guard';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { IComic } from './comic.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateComicDTO } from './DTO/create-comic';
import { CreateChapterDTO } from '../chapter/DTO/create-chapter';
import { INotification } from '../notification/notification.interface';
import { IdUser } from '../user/decorators/id-user';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';

@Controller('api/comic')
export class ComicController {
  constructor(
    private comicService: ComicService,
    private chapterService: ChapterService,
    private cloudinaryService: CloudinaryService,
    private notifyService: NotificationService,
    private userService: UserService,
  ) {}

  @Get()
  async getAllComic(@Query() query: any, @Res() response: Response) {
    try {
      const temp_comics = await this.comicService.getAll(query);

      const comics = [];

      for (const comic of temp_comics) {
        const chapter_newest = await this.chapterService.getNewestChapter(
          comic.id,
        );

        const temp_comic = {
          ...comic,
          new_chapter: chapter_newest,
        };

        comics.push(temp_comic);
      }
      const total = await this.comicService.getTotal();

      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'get all comic successfully!',
        result: comics,
        total: total,
      });
    } catch (error) {
      return response.status(error.status | 500).json({
        statusCode: error.status | 500,
        success: false,
        message: 'INTERNAL SERVER ERROR',
      });
    }
  }

  @UseGuards(JwtAuthorizationd)
  @UseInterceptors(FileInterceptor('file'))
  @Post('/create')
  async createComic(
    @Body(new ValidationPipe()) comic: CreateComicDTO,
    // @IdUser() id_user: number,
    @Res() response: Response,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const data_new_comic: IComic = {
        ...comic,
      };

      data_new_comic.authors = JSON.parse(data_new_comic.authors[0]);
      data_new_comic.genres = JSON.parse(data_new_comic.genres[0]);

      const new_comic = await this.comicService.create(data_new_comic);

      this.cloudinaryService
        .uploadFileFromBuffer(file.buffer, `comics/${new_comic.id}/thumb`)
        .then((data) => {
          this.comicService.updateThumb(new_comic.id, data.url);
        });

      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'Tạo truyện mới thành công!',
        result: new_comic,
      });
    } catch (error) {
      console.log(error);
      return response.status(error.status | 500).json({
        statusCode: error.status | 500,
        success: false,
        message: 'INTERNAL SERVER ERROR',
      });
    }
  }

  @Get('/genres')
  async getGenres(@Res() response: Response) {
    try {
      const genres = await this.comicService.getGenres();
      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'Tăng thành công!',
        result: genres,
      });
    } catch (error) {
      return response.status(error.status | 500).json({
        statusCode: error.status | 500,
        success: false,
        message: 'INTERNAL SERVER ERROR',
      });
    }
  }

  @Get('/ranking')
  async getRanking(@Query() query: any, @Res() response: Response) {
    try {
      const comics = await this.comicService.ranking(query);

      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'get all comic successfully!',
        result: comics,
      });
    } catch (error) {
      return response.status(error.status | 500).json({
        statusCode: error.status | 500,
        success: false,
        message: 'INTERNAL SERVER ERROR',
      });
    }
  }

  @Get('/search')
  async search(@Query() query: any, @Res() response: Response) {
    try {
      const comics = await this.comicService.search(query);

      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'Tìm kiếm thành công!',
        result: comics ? comics : [],
      });
    } catch (error) {
      return response.status(error.status | 500).json({
        statusCode: error.status | 500,
        success: false,
        message: 'INTERNAL SERVER ERROR',
      });
    }
  }

  @Get(':name')
  async getComic(@Param('name') name_comic: string, @Res() response: Response) {
    try {
      const comic = await this.comicService.getOne(name_comic);
      const chapters = await this.chapterService.getAll(comic.id);

      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'get all comic successfully!',
        result: {
          comic,
          chapters,
        },
      });
    } catch (error) {
      return response.status(error.status | 500).json({
        statusCode: error.status | 500,
        success: false,
        message: 'INTERNAL SERVER ERROR',
      });
    }
  }

  @UseGuards(JwtAuthorizationd)
  @UseInterceptors(AnyFilesInterceptor())
  @Post('/chapter/create')
  async createChapterForComic(
    @Body(new ValidationPipe()) chapter: CreateChapterDTO,
    @IdUser() id_user: number,
    @Res() response: Response,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      const new_chapter = await this.chapterService.create({ ...chapter });

      this.cloudinaryService
        .uploadMultipleFile(
          files,
          `comics/${new_chapter.id_comic}/${new_chapter.id}`,
        )
        .then((data) => this.chapterService.updateImages(new_chapter.id, data));

      this.comicService.getById(new_chapter.id_comic).then((comic) => {
        const notify: INotification = {
          id_user,
          title: 'Chương mới!',
          body: `${comic.name} vừa cập nhật thêm chapter mới - ${new_chapter.name}.`,
          redirect_url: `http://localhost:3001/comic/${comic.slug}/${new_chapter.slug}`,
          thumb: comic.thumb,
        };

        this.notifyService.create(notify);

        this.userService
          .checkFollowing(id_user, new_chapter.id_comic)
          .then((data) => {
            if (data) {
              this.notifyService.notifyToUser(notify);
            }
          });
      });

      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'Tạo chpater cho truyện thành công!',
        result: new_chapter,
      });
    } catch (error) {
      console.log(error);
      return response.status(error.status | 500).json({
        statusCode: error.status | 500,
        success: false,
        message: 'INTERNAL SERVER ERROR',
      });
    }
  }

  @Get(':name/increment')
  async increament(
    @Query() query: any,
    @Param('name') slug_comic: string,
    @Res() response: Response,
  ) {
    try {
      const updated_comic = await this.comicService.increment(
        slug_comic,
        query.field,
        parseInt(query.jump),
      );

      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'Tăng thành công!',
        result: updated_comic,
      });
    } catch (error) {
      return response.status(error.status | 500).json({
        statusCode: error.status | 500,
        success: false,
        message: 'INTERNAL SERVER ERROR',
      });
    }
  }
}
