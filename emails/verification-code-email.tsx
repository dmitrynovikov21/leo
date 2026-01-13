import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Preview,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";

import { Icons } from "../components/shared/icons";

type VerificationCodeEmailProps = {
    firstName: string;
    code: string;
    siteName: string;
};

export const VerificationCodeEmail = ({
    firstName = "",
    code,
    siteName,
}: VerificationCodeEmailProps) => (
    <Html>
        <Head />
        <Preview>
            Ваш код подтверждения для {siteName}
        </Preview>
        <Tailwind>
            <Body className="bg-white font-sans">
                <Container className="mx-auto py-5 pb-12">
                    <Icons.logo className="m-auto block size-10" />
                    <Text className="text-base">Привет, {firstName}!</Text>
                    <Text className="text-base">
                        Для подтверждения вашей электронной почты введите следующий код:
                    </Text>
                    <Section className="my-5 text-center">
                        <Text className="text-4xl font-bold tracking-widest text-zinc-900">
                            {code}
                        </Text>
                    </Section>
                    <Text className="text-base">
                        Код действителен в течение 15 минут.
                    </Text>
                    <Text className="text-base text-gray-600">
                        Если вы не регистрировались на {siteName}, просто проигнорируйте это письмо.
                    </Text>
                    <Hr className="my-4 border-t-2 border-gray-300" />
                    <Text className="text-sm text-gray-600">
                        {siteName}
                    </Text>
                </Container>
            </Body>
        </Tailwind>
    </Html>
);
