import { Injectable } from '@nestjs/common';
import { CreateRoleManagementDto } from './dto/create-role-management.dto';
import { UpdateRoleManagementDto } from './dto/update-role-management.dto';

@Injectable()
export class RoleManagementService {
  create(createRoleManagementDto: CreateRoleManagementDto) {
    return 'This action adds a new roleManagement';
  }

  findAll() {
    return `This action returns all roleManagement`;
  }

  findOne(id: number) {
    return `This action returns a #${id} roleManagement`;
  }

  update(id: number, updateRoleManagementDto: UpdateRoleManagementDto) {
    return `This action updates a #${id} roleManagement`;
  }

  remove(id: number) {
    return `This action removes a #${id} roleManagement`;
  }
}
