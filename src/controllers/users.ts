import { Controller, Get, Post, Req } from "@nestjs/common";
import { UsersService } from "../services/users";
import { Request } from "express";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async login(@Req() request: Request) {
    return "123";
  }

  @Get()
  async getUserByUsername(): Promise<string> {
    return this.usersService.getUserByUsername("123");
  }
}
