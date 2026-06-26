import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotebookEntryDto } from './dtos/create-notebook-entry.dto';
import { UpdateNotebookEntryDto } from './dtos/update-notebook-entry.dto';

@Injectable()
export class NotebookService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.notebookEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const entry = await this.prisma.notebookEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Notebook entry not found');
    return entry;
  }

  create(userId: string, dto: CreateNotebookEntryDto) {
    return this.prisma.notebookEntry.create({
      data: {
        userId,
        date: dto.date ? new Date(dto.date) : new Date(),
        title: dto.title ?? null,
        content: dto.content ?? '',
        tags: dto.tags ?? [],
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateNotebookEntryDto) {
    await this.findOne(userId, id); // ownership check
    return this.prisma.notebookEntry.update({
      where: { id },
      data: {
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // ownership check
    await this.prisma.notebookEntry.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
