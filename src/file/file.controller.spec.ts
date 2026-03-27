import { Test, TestingModule } from '@nestjs/testing';
import { FileController } from './file.controller';
import { FileService } from './file.service';

describe('FileController', () => {
  let controller: FileController;
  let fileService: any;

  beforeEach(async () => {
    const mockFileService = {
      listFiles: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [{ provide: FileService, useValue: mockFileService }],
    }).compile();

    controller = module.get<FileController>(FileController);
    fileService = module.get(FileService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listFiles', () => {
    it('should return file list with default pagination', async () => {
      const mockResult = {
        list: [
          {
            id: 1,
            hash: 'abc123',
            file_name: 'test.jpg',
            size: 1024,
            ref_count: 1,
          },
        ],
        total: 1,
      };
      fileService.listFiles.mockResolvedValue(mockResult);

      const result = await controller.listFiles();

      expect(fileService.listFiles).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockResult);
    });

    it('should return file list with custom pagination', async () => {
      const mockResult = { list: [], total: 0 };
      fileService.listFiles.mockResolvedValue(mockResult);

      const result = await controller.listFiles('2', '10');

      expect(fileService.listFiles).toHaveBeenCalledWith(2, 10);
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteFile', () => {
    it('should delete file by hash', async () => {
      const mockResult = { success: true };
      fileService.deleteFile.mockResolvedValue(mockResult);

      const result = await controller.deleteFile('abc123');

      expect(fileService.deleteFile).toHaveBeenCalledWith('abc123');
      expect(result).toEqual(mockResult);
    });
  });
});
