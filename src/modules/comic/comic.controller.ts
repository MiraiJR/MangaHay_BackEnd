import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ComicService } from './comic.service';
import { JwtAuthorizationd } from '../../common/guards/jwt-guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Roles, RolesGuard } from '../../common/guards/check-role';
import { UserRole } from '../user/user.role';
import { CreateComicDTO } from './dtos/create-comic';
import { RedisService } from '../redis/redis.service';
import UserId from '../user/decorators/userId';
import { GetComicsDTO } from './dtos/getComics';
import { ScoreDTO } from './dtos/evaluateComic';
import { CreateChapterDTO } from '../chapter/dtos/create-chapter';
import { CreateCommentDTO } from '../comment/dtos/create-comment';
import { CommentService } from '../comment/comment.service';
import { CreateAnswerDTO } from '../answer-comment/dtos/create-answer';
import { IncreaseFieldDTO } from './dtos/increaseField';
import { CrawlChapterDTO } from './dtos/crawlChapter';
import { CrawlAllChaptersDTO } from './dtos/crawlAllChapters';

@Controller('api/comics')
export class ComicController {
  constructor(
    private comicService: ComicService,
    private redisService: RedisService,
    private commentService: CommentService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async handleGetComics(
    @Query(new ValidationPipe())
    query: GetComicsDTO,
  ) {
    const comics = await this.comicService.getComics(query);
    const total = await this.comicService.countComics();

    return {
      comics,
      total,
    };
  }

  @UseGuards(JwtAuthorizationd)
  @Get('/created-by-me')
  async handleGetComicsCreatedByMe(@UserId() userId: number) {
    const comics = await this.comicService.getComicsCreatedByCreator(userId);

    return comics;
  }

  @UseGuards(JwtAuthorizationd, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TRANSLATOR)
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  async handleCreateComic(
    @Body(new ValidationPipe()) comic: CreateComicDTO,
    @UserId() creatorId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const newComic = await this.comicService.createComic(creatorId, comic, file);

    return newComic;
  }

  @UseGuards(JwtAuthorizationd)
  @Roles(UserRole.ADMIN)
  @Post(':comicId/crawl-chapter')
  async handleCrawlChapterForComic(
    @UserId() userId: number,
    @Body(new ValidationPipe()) data: CrawlChapterDTO,
    @Param('comicId', new ParseIntPipe()) comicId: number,
  ) {
    const { nameChapter, urlPost, querySelector, attribute } = data;
    await this.comicService.crawlChapterForComic(
      userId,
      comicId,
      nameChapter,
      urlPost,
      querySelector,
      attribute,
    );

    return 'Cào dữ liệu thành công!';
  }

  @UseGuards(JwtAuthorizationd)
  @Roles(UserRole.ADMIN)
  @Post(':comicId/crawl-all-chapters')
  async handleCrawlAllChaptersForComic(
    @UserId() userId: number,
    @Body(new ValidationPipe()) data: CrawlAllChaptersDTO,
    @Param('comicId', new ParseIntPipe()) comicId: number,
  ) {
    const { querySelector, attribute, urls } = data;
    await this.comicService.crawlChaptersFromWebsite(
      userId,
      comicId,
      urls,
      querySelector,
      attribute,
    );

    return 'Cào dữ liệu thành công!';
  }

  @UseGuards(JwtAuthorizationd, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TRANSLATOR)
  @Put('/:comicId')
  @UseInterceptors(FileInterceptor('file'))
  async handleUpdateComic(
    @Body(new ValidationPipe()) comic: CreateComicDTO,
    @UserId() userId: number,
    @Param('comicId', new ParseIntPipe()) comicId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updatedComic = await this.comicService.updateComic(
      userId,
      { ...comic, id: comicId },
      file,
    );

    return updatedComic;
  }

  @Get('/ranking')
  async handleGetRanking(@Query() query: { field: string; limit: number }) {
    const comics = await this.comicService.ranking(query);

    return comics;
  }

  @Get('/search')
  async handleSearch(@Query() query: QuerySearch) {
    const comics = await this.comicService.searchComic(query);

    return comics;
  }

  @Get('/chapters')
  async getComicsWithChapters() {
    const comicsWithChapters = await this.comicService.getComicsWithChapters();

    return comicsWithChapters;
  }

  @Get(':slug')
  async handleGetComic(@Param('slug') slugComic: string) {
    const comic = await this.comicService.getComicBySlug(slugComic);
    const chapters = await this.comicService.getChapters(comic.id);
    const comments = await this.commentService.getCommentsOfComic(comic.id);

    return {
      comic,
      chapters,
      comments,
    };
  }

  @UseGuards(JwtAuthorizationd, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('delete/:comicId')
  async handleDeleteComic(@Param('comicId', new ParseIntPipe()) comicId: number) {
    await this.comicService.delete(comicId);

    return `Xóa truyện với id ${comicId} thành công!`;
  }

  @Patch(':comicId/increment')
  async handleIncreament(
    @Query(new ValidationPipe()) query: IncreaseFieldDTO,
    @Param('comicId') comicId: number,
  ) {
    await this.comicService.increaseTheNumberViewOrFollowOrLike(comicId, query.field, query.jump);

    return `Tăng [${query.field}] cho truyện thành công!`;
  }

  @UseGuards(JwtAuthorizationd)
  @Patch(':comicId/evaluate')
  async handleEvaluateComic(
    @Body(new ValidationPipe()) data: ScoreDTO,
    @UserId() userId: number,
    @Param('comicId', new ParseIntPipe()) comicId: number,
  ) {
    const { score } = data;
    await this.comicService.evaluateComic(userId, comicId, score);

    return `Đánh giá truyện thành công!`;
  }

  @UseGuards(JwtAuthorizationd, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TRANSLATOR)
  @UseInterceptors(FilesInterceptor('files'))
  @Post(':comicId/chapters')
  async handleCreateChapterForComic(
    @Body(new ValidationPipe()) data: CreateChapterDTO,
    @UserId() userId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Param('comicId', new ParseIntPipe()) comicId: number,
  ) {
    const { nameChapter } = data;
    await this.comicService.addNewChapterForComic(userId, comicId, nameChapter, files);
    return `Tạo chapter với cho truyện id [${comicId}] thành công!`;
  }

  @Get(':comicId/chapters/:chapterId')
  async getOneChapter(
    @Param('chapterId', new ParseIntPipe()) chapterId: number,
    @Param('comicId', new ParseIntPipe()) comicId: number,
  ) {
    const chapter = await this.comicService.getASpecificChapterOfComic(comicId, chapterId);

    return chapter;
  }

  @UseGuards(JwtAuthorizationd)
  @Post(':comicId/comments')
  async handleCommentComic(
    @Param('comicId', new ParseIntPipe()) comicId: number,
    @UserId() userId: number,
    @Body(new ValidationPipe()) data: CreateCommentDTO,
  ) {
    const { content } = data;
    const newComment = await this.comicService.commentOnComic(userId, comicId, content);

    return newComment;
  }

  @UseGuards(JwtAuthorizationd)
  @Post(':comicId/comments/:commentId/answer')
  async handleReplyComment(
    @Param('comicId', new ParseIntPipe()) comicId: number,
    @Param('commentId', new ParseIntPipe()) commentId: number,
    @UserId() userId: number,
    @Body(new ValidationPipe()) data: CreateAnswerDTO,
  ) {
    const { content, mentionedPerson } = data;
    await this.comicService.addAnswerToCommentOfComic(
      userId,
      comicId,
      commentId,
      content,
      mentionedPerson,
    );

    return `Trả lời bình luận thành công!`;
  }
}
