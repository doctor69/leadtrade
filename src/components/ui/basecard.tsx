import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface BaseCardProps {
    cardTitle?: string,
    cardDescription?: string,
    cardContent?: string,
    cardFooter?: string,
}

export default function BaseCard (props: BaseCardProps) {

    const { cardTitle, cardDescription, cardContent, cardFooter } = props

    return (
        <div className="w-1/3">
            <Card>
                <CardHeader>
                    <CardTitle>{cardTitle}</CardTitle>
                    <CardDescription>{cardDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>{cardContent}</p>
                </CardContent>
                <CardFooter>
                    <p>{cardFooter}</p>
                </CardFooter>
            </Card>

        </div>
    )
}