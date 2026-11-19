import { IsString, IsOptional, IsArray, ValidateNested, ArrayMinSize, Length, IsBoolean, Equals } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsString()
  nombreCliente: string;

  @IsString()
  @Length(10, 10, { message: 'El teléfono debe tener 10 dígitos' })
  telefono: string;

  @IsString()
  direccion: string;

  @IsString()
  ciudad: string;

  @IsString()
  metodoEnvio: 'Local' | 'Nacional';

  @IsString()
  metodoPago: 'Nequi' | 'Bancolombia';

  @IsOptional()
  @IsString()
  notas?: string;

  @IsBoolean()
  @Equals(true, {
    message:
      'Debes autorizar expresamente el tratamiento de datos personales conforme a la Ley 1581 de 2012 (Habeas Data).',
  })
  aceptaHabeasData: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
