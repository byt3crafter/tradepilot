import { PartialType } from '@nestjs/mapped-types';
import { CreatePropFirmTemplateDto } from './create-prop-firm-template.dto';

export class UpdatePropFirmTemplateDto extends PartialType(CreatePropFirmTemplateDto) {}
