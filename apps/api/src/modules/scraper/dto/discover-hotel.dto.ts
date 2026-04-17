import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DiscoverHotelDto {
    @ApiProperty({
        example: 'Grand Palace Hotel',
        description: 'Name of the hotel to search for',
    })
    @IsString()
    @IsNotEmpty({ message: 'Hotel name is required' })
    @MaxLength(255)
    hotelName: string;

    @ApiProperty({
        example: 'Surat',
        description: 'City where the hotel is located',
    })
    @IsString()
    @IsNotEmpty({ message: 'City is required' })
    @MaxLength(255)
    city: string;
}
