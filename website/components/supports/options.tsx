import { MotionConfig, motion } from 'motion/react';

const Testimonial = ({
  imgSrc,
  name,
  title,
  company,
  content,
}: {
  imgSrc: string;
  name: string;
  title: string;
  company: string;
  content: string;
}) => (
  <MotionConfig
    transition={{
      duration: 0.2,
      ease: 'easeInOut',
    }}
  >
    <motion.div
      initial={{
        y: 0,
      }}
      animate={{
        y: -8,
      }}
      exit={{
        y: 0,
      }}
      className="w-full overflow-hidden rounded-lg border-2 border-zinc-900 bg-white p-8 md:p-12"
    >
      <div className="mb-6 flex items-center gap-6">
        <div className="rounded-lg bg-zinc-900">
          <motion.img
            initial={{
              rotate: '0deg',
              opacity: 0,
            }}
            animate={{
              rotate: '3deg',
              opacity: 1,
            }}
            exit={{
              rotate: '0deg',
              opacity: 0,
            }}
            src={imgSrc}
            alt="avatar"
            className="size-24 rounded-lg border-2 border-zinc-900 bg-indigo-200"
          />
        </div>
        <motion.div
          initial={{
            y: 12,
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: -12,
            opacity: 0,
          }}
        >
          <span className="mb-1.5 block text-3xl font-medium">{name}</span>
          <span className="text-zinc-600">
            {title} – <span className="text-indigo-600">{company}</span>
          </span>
        </motion.div>
      </div>
      <motion.p
        initial={{
          y: 12,
          opacity: 0,
        }}
        animate={{
          y: 0,
          opacity: 1,
        }}
        exit={{
          y: -12,
          opacity: 0,
        }}
        className="text-xl leading-relaxed"
      >
        {content}
      </motion.p>
    </motion.div>
  </MotionConfig>
);

export const OPTIONS = [
  {
    title: 'Startups',
    Content: () => (
      <Testimonial
        imgSrc="https://api.dicebear.com/8.x/notionists/svg?seed=Jeff"
        name="Jeff W."
        title="CEO"
        company="The Company"
        content="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Odit qui unde perspiciatis nam in maxime impedit repudiandae veniam quibusdam enim, velit minus necessitatibus quaerat quos similique, odio earum!"
      />
    ),
  },
  {
    title: 'YouTubers',
    Content: () => (
      <Testimonial
        imgSrc="https://api.dicebear.com/8.x/notionists/svg?seed=Dan"
        name="Dan S."
        title="YouTuber"
        company="@TheChannel"
        content="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Blanditiis qui fuga, deserunt doloribus, vero autem libero sed dolorum nostrum quidem in soluta magni eos excepturi."
      />
    ),
  },
  {
    title: 'Bloggers',
    Content: () => (
      <Testimonial
        imgSrc="https://api.dicebear.com/8.x/notionists/svg?seed=Carey"
        name="Carey J."
        title="Writer"
        company="theblog.com"
        content="Lorem ipsum dolor sit amet consectetur adipisicing elit. At, quo harum."
      />
    ),
  },
  {
    title: 'Authors',
    Content: () => (
      <Testimonial
        imgSrc="https://api.dicebear.com/8.x/notionists/svg?seed=Dani"
        name="Moriah H."
        title="Author"
        company="Books About Things"
        content="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Blanditiis qui fuga, deserunt doloribus, vero autem libero sed dolorum nostrum quidem in soluta magni eos excepturi."
      />
    ),
  },
  {
    title: 'Designers',
    Content: () => (
      <Testimonial
        imgSrc="https://api.dicebear.com/8.x/notionists/svg?seed=Phil"
        name="Phil K."
        title="UI/UX Design"
        company="The Other Company"
        content="Lorem ipsum dolor sit amet consectetur adipisicing elit. Ex a laborum earum quo unde pariatur consequuntur molestias!"
      />
    ),
  },
  {
    title: 'Consultants',
    Content: () => (
      <Testimonial
        imgSrc="https://api.dicebear.com/8.x/notionists/svg?seed=Stetson"
        name="Stetson R."
        title="Consultant"
        company="The Company Company"
        content="Lorem ipsum dolor sit amet consectetur adipisicing elit. Labore, dicta. Doloremque, hic magnam? Eveniet quisquam porro rerum, voluptatem et aliquam eaque nesciunt quod magni veritatis tempora ducimus!"
      />
    ),
  },
  {
    title: 'Photographers',
    Content: () => (
      <Testimonial
        imgSrc="https://api.dicebear.com/8.x/notionists/svg?seed=Patty"
        name="Patty G."
        title="Photographer"
        company="@ThePictureLady"
        content="Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corporis, quam? Quia veniam cupiditate officiis."
      />
    ),
  },
  {
    title: 'Videographers',
    Content: () => (
      <Testimonial
        imgSrc="https://api.dicebear.com/8.x/notionists/svg?seed=Kert"
        name="Kert Y."
        title="Film Maker"
        company="@MovieDude"
        content="Lorem ipsum dolor, sit amet consectetur adipisicing elit. Iste, eius corrupti! Alias dolore quibusdam ipsum magnam delectus nulla sint harum ab?"
      />
    ),
  },
  {
    title: 'Local Business',
    Content: () => (
      <Testimonial
        imgSrc="https://api.dicebear.com/8.x/notionists/svg?seed=Joanne"
        name="Joanne F."
        title="Business Owner"
        company="The Local Company"
        content="Lorem ipsum dolor sit, amet consectetur adipisicing elit. Blanditiis qui fuga, deserunt doloribus, vero autem libero sed dolorum nostrum quidem in soluta magni eos excepturi."
      />
    ),
  },
];
