import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { RoleName } from '../../database/prisma-client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN_NEGOCIO)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: UserQueryDto) {
    return this.usersService.listUsers(user, query);
  }

  @Post('invite')
  invite(@CurrentUser() user: RequestUser, @Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.usersService.getUser(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(user, id, dto);
  }

  @Delete(':id')
  deactivate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.usersService.deactivateUser(user, id);
  }

  @Post(':id/deactivate')
  deactivateAction(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.usersService.deactivateUser(user, id);
  }

  @Post(':id/activate')
  activate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.usersService.activateUser(user, id);
  }

  @Post(':id/resend-invitation')
  resendInvitation(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.usersService.resendInvitation(user, id);
  }
}
