import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const HEX_COLOR = /^#([0-9a-fA-F]{3}){1,2}$/;
const FONT_OPTIONS = ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato'];
const RADIO_OPTIONS = ['NINGUNO', 'PEQUENO', 'MEDIO', 'GRANDE', 'COMPLETO'];
const THEME_OPTIONS = ['CLARO', 'OSCURO', 'AUTO'];

export class UpdateBusinessProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipoNegocio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  barrio?: string;

  @IsOptional()
  @IsNumber()
  latitud?: number;

  @IsOptional()
  @IsNumber()
  longitud?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  banner?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  eslogan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tiktok?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtube?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sitioWeb?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'colorPrimario debe ser un color hexadecimal (#RRGGBB)' })
  colorPrimario?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'colorSecundario debe ser un color hexadecimal (#RRGGBB)' })
  colorSecundario?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'colorAcento debe ser un color hexadecimal (#RRGGBB)' })
  colorAcento?: string;

  @IsOptional()
  @IsString()
  @IsIn(FONT_OPTIONS, { message: `fuente debe ser una de: ${FONT_OPTIONS.join(', ')}` })
  fuente?: string;

  @IsOptional()
  @IsString()
  @IsIn(THEME_OPTIONS, { message: `modoTema debe ser uno de: ${THEME_OPTIONS.join(', ')}` })
  modoTema?: string;

  @IsOptional()
  @IsString()
  @IsIn(RADIO_OPTIONS, { message: `radioTarjeta debe ser uno de: ${RADIO_OPTIONS.join(', ')}` })
  radioTarjeta?: string;

  @IsOptional()
  @IsBoolean()
  mostrarPrecios?: boolean;

  @IsOptional()
  @IsBoolean()
  mostrarStock?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  textoBienvenida?: string;

  @IsOptional()
  @IsBoolean()
  deliveryActivo?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryCostoBase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryRadioKm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  deliveryHorarioInicio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  deliveryHorarioFin?: string;
}
