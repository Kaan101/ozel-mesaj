import { Module } from "@nestjs/common";
import { MessageSuggestionsController } from "./message-suggestions.controller";
import { MessageSuggestionsService } from "./message-suggestions.service";

@Module({
  controllers: [MessageSuggestionsController],
  providers: [MessageSuggestionsService],
})
export class MessageSuggestionsModule {}
