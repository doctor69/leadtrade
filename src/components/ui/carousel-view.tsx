import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"

import Basecard from "./basecard"

export default function CarouselView() {

    return (
        <Carousel opts={{
            align: "start",
            loop: true,
        }}
            plugins={
                [Autoplay({
                    delay: 2000
                })]
            }>
            <CarouselContent>
                <CarouselItem key="1" className="md:basis-1/2 lg:basis-1/2">
                    <Basecard cardTitle="test card 2" cardDescription="new card for test" cardContent="loper ojfsdjf fs jdfiosjfl kdjslkjlsdkjf oidsj kl \n jfsdkjfklj kjdflk \n fjlskdfkj kjfs \n fsdklflskdjfs \nfksldjflkjsdlkf" cardFooter="copywithre dr69"></Basecard>
                </CarouselItem>
                <CarouselItem key="2" className="md:basis-1/2 lg:basis-1/2">
                    <Basecard cardTitle="test card 3" cardDescription="new card for test" cardContent="loper ojfsdjf fs jdfiosjfl kdjslkjlsdkjf oidsj kl \n jfsdkjfklj kjdflk \n fjlskdfkj kjfs \n fsdklflskdjfs \nfksldjflkjsdlkf" cardFooter="copywithre dr69"></Basecard>
                </CarouselItem>
                <CarouselItem key="3" className="md:basis-1/2 lg:basis-1/2">
                    <Basecard cardTitle="test card 4" cardDescription="new card for test" cardContent="loper ojfsdjf fs jdfiosjfl kdjslkjlsdkjf oidsj kl \n jfsdkjfklj kjdflk \n fjlskdfkj kjfs \n fsdklflskdjfs \nfksldjflkjsdlkf" cardFooter="copywithre dr69"></Basecard>
                </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
    )
}